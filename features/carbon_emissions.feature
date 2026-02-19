@esg_app 
Feature: Chorus SS&C - ESG App Carbon Emissions

@esg_app-scenario1
 Scenario: User launch SSC Portal and log carbon emission details for Flight Travel
  Given I launch the Chorus portal for "TestCase10"
  When I login with username and password for "TestCase10"
  And I create a new worklist
  Then I select following options in the new worklist for "TestCase10"
  When I double click to open the created work item for "TestCase10"
  Then select mode of travel as Flight. Fill the flight details and click on submit for "TestCase10"
  Then transaction will move to next step and will calculate the emission
  Then provide feedback and click on End button to end the transaction

@esg_app-scenario2
 Scenario: User launch SSC Portal and log carbon emission details for Train Travel
  Given I launch the Chorus portal for "TestCase11"
  When I login with username and password for "TestCase11"
  And I create a new worklist
  Then I select following options in the new worklist for "TestCase11"
  When I double click to open the created work item for "TestCase11"
  Then select mode of travel as Train. Fill the details and click on submit for "TestCase11"
  Then transaction will move to next step and will calculate the emission
  Then provide feedback and click on End button to end the transaction

@esg_app-scenario3
 Scenario: User launch SSC Portal and log carbon emission details for Bus Travel
  Given I launch the Chorus portal for "TestCase12"
  When I login with username and password for "TestCase12"
  And I create a new worklist
  Then I select following options in the new worklist for "TestCase12"
  When I double click to open the created work item for "TestCase12"
  Then select mode of travel as Bus. Fill the details and click on submit for "TestCase12"
  Then transaction will move to next step and will calculate the emission
  Then provide feedback and click on End button to end the transaction